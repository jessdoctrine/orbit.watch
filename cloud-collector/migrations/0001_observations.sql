CREATE TABLE IF NOT EXISTS observations (
  region TEXT NOT NULL,
  sample_time INTEGER NOT NULL,
  total INTEGER NOT NULL CHECK(total >= 0),
  business INTEGER NOT NULL CHECK(business >= 0),
  agricultural INTEGER NOT NULL CHECK(agricultural >= 0),
  PRIMARY KEY (region, sample_time)
);
CREATE INDEX IF NOT EXISTS observations_region_time ON observations(region, sample_time DESC);
