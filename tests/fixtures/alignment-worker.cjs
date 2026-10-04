const readline = require("node:readline");
readline.createInterface({ input: process.stdin }).on("line", line => {
  const r = JSON.parse(line);
  if (r.text === "timeout") return;
  if (r.text === "malformed") { process.stdout.write("not json\n"); return; }
  if (r.text === "two x") { process.stdout.write(JSON.stringify({id:r.id,status:"recognized",duration:1,words:[{text:"2x",start:0.1,end:0.9,probability:0.9}]})+"\n"); return; }
  process.stdout.write(JSON.stringify({ id: r.id, status: "aligned", duration: 1,
    words: [{ text: r.text === "mismatch" ? "wrong" : r.text, start: 0.1, end: 0.9 }] }) + "\n");
});

