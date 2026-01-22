# Sample streamed files

The web app exposes a small set of sample files that can be streamed from the same origin. Files are served by the app route `/convert/samples?file=<filename>` and only requests whose `Origin` header matches the app origin are allowed.

Available sample files:

- dnd_characters.json -> /convert/samples?file=dnd_characters.json
- dnd_characters.ndjson -> /convert/samples?file=dnd_characters.ndjson
- dnd_characters.csv -> /convert/samples?file=dnd_characters.csv
- dnd_characters.xml -> /convert/samples?file=dnd_characters.xml

Examples:

curl with host header matching origin (replace example.com with your host):

```bash
curl -H "Origin: http://localhost:3000" "http://localhost:3000/convert/samples?file=dnd_characters.json"
```
