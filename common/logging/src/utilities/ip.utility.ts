import { createHash } from "crypto";

export class IPUtility {
    public static normalizeIp(ip: string): string {
        if (ip.startsWith("::ffff:")) {return ip.slice(7);}
        return ip;
    }

    public static hashIp(ip: string, pepper: string): string {
        const h = createHash("sha256");
        h.update(IPUtility.normalizeIp(ip));
        h.update(pepper);
        return h.digest("hex");
    }
}
