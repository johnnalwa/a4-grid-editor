import { networkInterfaces } from "os";

export function getLocalIP(): string {
  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch { /* ignore */ }
  return "localhost";
}
