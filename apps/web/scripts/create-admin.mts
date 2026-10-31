// Creates a staff user. There is no public registration and no default password.
// Usage: npm run admin:create -- --email you@example.com [--role Admin|Editor|Moderator] [--name "Display Name"]
// The password is read from MOTOSCOPE_ADMIN_PASSWORD or prompted for (input hidden).
import "./env.mts";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { allRoles, type Role } from "@/lib/auth/roles";
import { createStaffUser } from "@/lib/auth/staff";
import { closeDb } from "@/lib/db";

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  process.stdout.write(question);
  let muted = true;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY });
  const answer = await new Promise<string>((resolve) => rl.question("", resolve));
  muted = false;
  rl.close();
  process.stdout.write("\n");
  return answer;
}

const email = option("--email");
const role = (option("--role") ?? "Admin") as Role;
if (!email || !allRoles.includes(role)) {
  console.error(
    "Usage: npm run admin:create -- --email <email> [--role Admin|Editor|Moderator] [--name <display name>]",
  );
  process.exit(2);
}

try {
  const password = process.env.MOTOSCOPE_ADMIN_PASSWORD || (await promptHidden("Password: "));
  await createStaffUser({ email, password, role, displayName: option("--name") ?? null });
  console.log(`Created staff user with role ${role}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
