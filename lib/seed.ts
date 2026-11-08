import type { Library } from "./model";
// New installations start empty. Existing D1 records are never replaced.
// Personal notes, prices and photos belong in the database, not in Git history.
export function seedLibrary(): Library {
  return {schemaVersion:1,artists:[],collections:[],benefits:[],events:[],rawNotes:""};
}
