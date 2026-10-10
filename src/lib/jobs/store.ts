import { db } from "../db";
import { DurableJobStore } from "./repository";

export const jobStore = new DurableJobStore(db);
