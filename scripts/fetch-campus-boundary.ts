import {
  fetchNominatimCampusBoundary,
  fetchOverpassCampusBoundary,
  formatCampusBoundaryForSource,
} from "../server/campus-boundaries";

type CliOptions = {
  id: string;
  name: string;
  address: string;
  query: string;
  pattern: string;
  userAgent: string;
};

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error("Arguments must be passed as --key value pairs");
    }
    values.set(key.slice(2), value);
  }

  const name = values.get("name");
  return {
    id: requireValue(values, "id"),
    name: requireValue(values, "name"),
    address: requireValue(values, "address"),
    query: values.get("query") ?? name ?? "",
    pattern: values.get("pattern") ?? name ?? "",
    userAgent: values.get("user-agent") ?? process.env.OSM_USER_AGENT ?? "",
  };
}

function requireValue(values: Map<string, string>, key: string) {
  const value = values.get(key);
  if (!value) throw new Error(`Missing required argument --${key}`);
  return value;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.userAgent) {
    throw new Error("Set --user-agent or OSM_USER_AGENT before querying public OSM services");
  }

  const campus = await fetchNominatimCampusBoundary({
    id: options.id,
    name: options.name,
    address: options.address,
    query: options.query,
    userAgent: options.userAgent,
  }).catch(() =>
    fetchOverpassCampusBoundary({
      id: options.id,
      name: options.name,
      address: options.address,
      namePattern: options.pattern,
    }),
  );

  console.log(formatCampusBoundaryForSource(campus));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
