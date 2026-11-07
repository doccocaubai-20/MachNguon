import path from "node:path";

export const demoMode = process.env.APP_ENV === "demo";
export const dataRoot = path.resolve(process.cwd(), demoMode ? ".demo-data" : process.env.MACH_NGUON_DATA_DIR || ".data");
