import { promises as fs } from "node:fs";
import { dirname } from "node:path";

import type { BootState, BootStateStore } from "@boot/types";

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

export class FileBootStateStore implements BootStateStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<BootState | undefined> {
    try {
      const contents = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(contents) as BootState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  async save(state: BootState): Promise<void> {
    await ensureDir(this.filePath);
    await fs.writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
