import { randomUUID } from "node:crypto";
import type { Firestore, DocumentSnapshot } from "firebase-admin/firestore";
import type { Movie } from "./types";
import { elapsedDays, indiaDay } from "./validation";
import { HttpError } from "./server-auth";

type Input = Omit<Movie, "id" | "createdAt" | "updatedAt">;
function movieFrom(snapshot: DocumentSnapshot): Movie | null {
  return snapshot.exists ? { ...snapshot.data(), id: snapshot.id } as Movie : null;
}
export function createMovieStore(db: Firestore) {
  const movies = db.collection("movies");
  const catalog = db.doc("metadata/catalog");
  const summary = db.doc("analytics/summary");
  const daily = db.collection("daily_visits");
  const sessions = db.collection("visit_sessions");
  return {
    async listMovies(admin = false) {
      const result = await (admin ? movies : movies.where("published", "==", 1)).limit(200).get();
      return result.docs.map(doc => movieFrom(doc)!).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    },
    async getMovie(id: string) { return movieFrom(await movies.doc(id).get()); },
    async createMovie(input: Input) {
      const id = randomUUID(), now = Date.now(), ref = movies.doc(id);
      await db.runTransaction(async transaction => {
        const countDoc = await transaction.get(catalog);
        const count = countDoc.exists ? Number(countDoc.data()!.count) : (await transaction.get(movies.limit(201))).size;
        if (count >= 200) throw new HttpError(400, "The catalog holds up to 200 movies. Remove an old movie before adding another.");
        transaction.create(ref, { ...input, createdAt: now, updatedAt: now });
        transaction.set(catalog, { count: count + 1 });
      });
      return id;
    },
    async updateMovie(id: string, input: Input) {
      await db.runTransaction(async transaction => {
        const ref = movies.doc(id);
        if (!(await transaction.get(ref)).exists) throw new HttpError(404, "Movie not found.");
        transaction.update(ref, { ...input, updatedAt: Date.now() });
      });
    },
    async deleteMovie(id: string) {
      await db.runTransaction(async transaction => {
        const ref = movies.doc(id);
        if (!(await transaction.get(ref)).exists) throw new HttpError(404, "Movie not found.");
        const countDoc = await transaction.get(catalog);
        const count = countDoc.exists ? Number(countDoc.data()!.count) : (await transaction.get(movies.limit(201))).size;
        transaction.delete(ref);
        transaction.set(catalog, { count: Math.max(0, count - 1) });
      });
    },
    async recordVisit(id: string, day = indiaDay()) {
      await db.runTransaction(async transaction => {
        const session = sessions.doc(day + "_" + id);
        if ((await transaction.get(session)).exists) return;
        const totalDoc = await transaction.get(summary), dayRef = daily.doc(day);
        const dayDoc = await transaction.get(dayRef);
        const total = totalDoc.data() || {}, previous = dayDoc.data() || {};
        transaction.create(session, { day, createdAt: Date.now() });
        transaction.set(dayRef, { day, visits: Number(previous.visits || 0) + 1 });
        transaction.set(summary, { total: Number(total.total || 0) + 1, firstDay: total.firstDay && total.firstDay < day ? total.firstDay : day });
      });
    },
    async stats(now = new Date()) {
      const today = indiaDay(now), cutoff = indiaDay(new Date(now.getTime() - 29 * 86400000));
      const [totalDoc, recent] = await Promise.all([summary.get(), daily.where("day", ">=", cutoff).get()]);
      const totalData = totalDoc.data() || {}, total = Number(totalData.total || 0);
      const days = totalData.firstDay ? elapsedDays(totalData.firstDay, today) : 0;
      const rows = new Map(recent.docs.map(doc => [doc.id, Number(doc.data().visits || 0)]));
      const history = Array.from({ length: 30 }, (_, i) => {
        const day = indiaDay(new Date(now.getTime() - i * 86400000));
        return { day, visits: rows.get(day) || 0 };
      });
      return { today: history[0].visits, total, average: days ? Math.round(total / days * 10) / 10 : 0, days, daily: history };
    },
    async pruneSessions(now = new Date()) {
      const cutoff = indiaDay(new Date(now.getTime() - 31 * 86400000));
      const old = await sessions.where("day", "<", cutoff).limit(100).get();
      if (!old.empty) {
        const batch = db.batch();
        old.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    },
  };
}

