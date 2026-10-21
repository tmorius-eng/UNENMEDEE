import net from "node:net";

/**
 * Node's "happy eyeballs" gives each IPv4/IPv6 address only 250 ms to connect. From GitHub's US
 * runners a Mongolian .gov.mn server is ~250-300 ms away, so connections were abandoned before
 * they opened: `AggregateError [ETIMEDOUT]` with an empty message, and 57 sources backed off at
 * once. 3 s per attempt is still far below the request timeout. Imported for its side effect.
 */
net.setDefaultAutoSelectFamilyAttemptTimeout(3_000);
