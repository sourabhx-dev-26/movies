import { collection, doc, getFirestore, limit, onSnapshot, query, where } from "firebase/firestore";
import { firebaseApp } from "./firebase-app";
import type { Movie } from "./types";
const db = getFirestore(firebaseApp);
export function watchMovies(admin: boolean, onMovies: (movies: Movie[]) => void, onError: () => void) {
  const source = collection(db, "movies");
  return onSnapshot(admin ? query(source, limit(200)) : query(source, where("published", "==", 1), limit(200)), snapshot => {
    if (snapshot.metadata.fromCache && snapshot.empty) return;
    const movies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Movie)
      .filter(movie => typeof movie.title === "string" && typeof movie.watchUrl === "string" && typeof movie.driveFileId === "string")
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    onMovies(movies);
  }, onError);
}
export function watchVisits(onChange: () => void, onError: () => void) {
  return onSnapshot(doc(db, "analytics/summary"), onChange, onError);
}
