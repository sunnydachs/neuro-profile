"""Query funnel events from Workers Analytics Engine via GraphQL.

Usage (token+account from ~/.hermes/.env):
  python3 scripts/query_metrics.py              # last 7 days, grouped by event
  python3 scripts/query_metrics.py --days 30    # last 30 days
  python3 scripts/query_metrics.py --share      # share_click breakdown by target/type
"""
import json, os, sys, urllib.request

def _load_env():
    env = {}
    for ln in open(os.path.expanduser("~/.hermes/.env")):
        if "=" in ln and not ln.startswith("#"):
            k, v = ln.strip().split("=", 1)
            env[k] = v
    return env

def gql(query):
    env = _load_env()
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/graphql",
        data=body,
        headers={"Authorization": f"Bearer {env['CLOUDFLARE_API_TOKEN']}",
                 "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--share", action="store_true")
    args = p.parse_args()

    acc = _load_env()["CLOUDFLARE_ACCOUNT_ID"]
    base = (
        'viewer { accounts(filter: {accountTag: "%s"}) { '
        'workersAnalyticsEngineAdaptiveGroups(limit: 100, filter: {date_geq: "$S"}) { '
        "count dimensions { da0 da1 da3 da4 da5 } sum { requests avg { d0 d1 } max { d0 } } } } }"
    )
    start = __import__("datetime").date.today() - __import__("datetime").timedelta(days=args.days)
    iso = start.isoformat()
    q = base.replace("$S", iso) % acc

    d = gql(q)
    rows = d["data"]["viewer"]["accounts"][0]["workersAnalyticsEngineAdaptiveGroups"]
    if not rows:
        print("no data yet (dataset is created on first beacon write)")
    else:
        # da0=event da1=lang da3=type da4=target da5=grade; d0=durationSec d1=answered
        print(f"{'event':<14}{'lang':<6}{'type':<6}{'target':<8}{'grade':<7}{'count':>7}{'avg dur(s)':>11}{'avg ans':>9}")
        for r in sorted(rows, key=lambda x: (x["dimensions"]["da0"], x["dimensions"]["da1"])):
            dim = r["dimensions"]
            print(f"{dim['da0']:<14}{dim['da1']:<6}{dim['da3']:<6}{dim['da4']:<8}{dim['da5']:<7}{r['count']:>7}{r['sum']['avg']['d0']:>11.1f}{r['sum']['avg']['d1']:>9.1f}")
