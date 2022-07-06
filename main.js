const repl = require("repl"),
  https = require("https"),
  fs = require("fs"),
  cd = require("child_process"),
  rl = repl.start();
let pathName;

function start() {
  rl.question("Cole o link utilizando o botão direito do mouse> ", (link) => {
    pathName = link.slice(link.lastIndexOf("/") + 1);
    fs.mkdir(pathName, {}, (e) => {
      if (e) {
        if (e.code == "EEXIST") {
          console.log(
            "\x1B[31mPasta para o download já encontrada, delete-a e tente novamente!\x1B[0m"
          );
          rl.close();
        } else {
          throw e;
        }
      } else {
        getHtmlPage(link);
      }
    });
  });
}
start();

function getHtmlPage(link) {
  download(link).then((content) => {
    if (content.indexOf("Sorry, this URL is outdated.") !== -1) {
      console.log("\x1B[33mErro 301, redirecionando...\x1B[0m");
      newlink = content.slice(content.indexOf("Url") + 7);
      newlink = newlink.slice(0, newlink.indexOf(" "));
      getHtmlPage("https://www.xvideos.com/" + newlink);
    } else {
      getHlsServer(content);
    }
  });
}

function getHlsServer(html) {
  html = html.slice(html.indexOf("setVideoHLS") + 13);
  let hls = html.slice(0, html.indexOf("'"));
  console.log("\x1B[33mObtendo Resoluções...\x1B[0m");
  download(hls).then((m3u8) => {
    let resolutions = [],
      pathResolutions = [];
    m3u8 = m3u8.split("\n");
    m3u8.shift();
    m3u8.pop();
    for (let n in m3u8) {
      if (n % 2 == 0) {
        resolutions.push(
          Number(m3u8[n].slice(m3u8[n].indexOf("NAME") + 6).slice(0, -2))
        );
      } else {
        pathResolutions.push(m3u8[n]);
      }
    }
    resolutions.sort((a, b) => {
      return a - b;
    });
    for (let n in resolutions) {
      console.log(`\x1B[32m ${Number(n) + 1} - ${resolutions[n]}p\x1B[0m`);
    }
    rl.question(
      "Digite o número referente à resolução preferida e aperte Enter> ",
      (res) => {
        let num;
        for (let n in pathResolutions) {
          if (pathResolutions[n].indexOf(resolutions[res - 1] + "p") !== -1) {
            num = n;
            break;
          }
        }
        download(
          hls.slice(0, hls.lastIndexOf("/") + 1) + pathResolutions[num]
        ).then((fragtxt) => {
          getFrags(hls.slice(0, hls.lastIndexOf("/") + 1), fragtxt);
        });
      }
    );
  });
}

function getFrags(base, fragtxt) {
  fragtxt = fragtxt.split("\n");
  let tsarr = [];
  for (let n of fragtxt) {
    if (n.startsWith("hls")) {
      tsarr.push(n);
    }
  }
  console.log("\033[33mbaixando... 0%\033[0m");
  let num = 0;
  let query = false;
  if(tsarr[0].indexOf("?")!==-1) query = true;
  downloadLoop();

  function downloadLoop() {
    download(base + tsarr[num], true).then((ts) => {
      fs.writeFileSync(
        `./${pathName}/${query?tsarr[num].slice(0, tsarr[num].indexOf("?")):tsarr[num]}`,
        ts
      );
      ++num;
      console.log(
        "            \033[33m\033[1A" +
          Math.round(num / (tsarr.length / 100)) +
          "%\033[0m"
      );
      if (tsarr[num]) {
        downloadLoop();
      } else {
        concatTs();
      }
    });
  }
}

function concatTs() {
  console.log("\x1B[32mDownload Finalizado!\x1B[0m");
  
  rl.close();
}

function download(link, returnChunks) {
  return new Promise((resolve) => {
    let chunks = [];
    https.get(link, (res) => {
      res.on("data", (data) => {
        chunks.push(data);
      });
      res.on("close", () => {
        let message;
        if (returnChunks) {
          message = Buffer.concat(chunks);
        } else {
          message = Buffer.concat(chunks).toString();
        }
        resolve(message);
      });
    });
  });
}
