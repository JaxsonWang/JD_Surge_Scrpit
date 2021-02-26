const axios = require('axios')
const fs = require('fs')
const path = require('path')

const scripts = []
let sgmodule = ''
const repoName = process.env.REPO_NAME
const repoRaw = `https://raw.githubusercontent.com/${repoName}/main/scripts/`

const regex = /([\s\S]*)\s(https:\/\/\S*.js),\stag=(\S*),[\s\S]*/

const gallyJson = [{
  json: "https://jdsharedresourcescdn.azureedge.net/jdresource/lxk0301_gallery.json",
  cdn: "https://jdsharedresourcescdn.azureedge.net/jdresource"
}]


!(async () => {
  let ok = await initConfig()
  if (ok) {
    await main()
  }
})()

async function initConfig() {
  // 映射脚本路径
  for (let item of gallyJson) {
    let json = item.json
    let boxJson = await restFile(json)

    if (!boxJson.task) {
      continue
    }

    for (let task of boxJson.task) {
      let script = task.match(/.*\/(.+?\.js)/)[1]
      await downFile(`${item.cdn}/${script}`)
      scripts.push({
        key: script,
        value: `${item.cdn}/${script}`
      })
      // 合并
      const reg = regex.exec(task)
      sgmodule += `${reg[3]} = type=cron,cronexp=${reg[1]},wake-system=1,timeout=3600,script-path=${repoRaw}${script}\n`
    }
  }

  if (scripts.length === 0) {
    console.log('脚本列表为空')
    return false
  }

  return true
}

async function main() {
  console.log('生成 Surge Modules 配置文件')
  const newText = `#!name=JD Tasks
#!desc=iOS Surge JD Task List

[Script]
${sgmodule}
[MITM]
hostname = %APPEND% wq.jd.com, draw.jdfcloud.com, jdjoy.jd.com, account.huami.com, wq.jd.com`

  fs.writeFile(path.join(__dirname, 'Surge', 'JDTaskScript.sgmodule'), newText, 'utf8', function (error) {
    if (error) {
      console.log(error)
      return false;
    }
    console.log('写入成功')
  })
}

async function restFile(url) {
  return new Promise(async (resovle) => {
    let name = fileName(url)
    axios.defaults.headers.post['Content-Type'] = 'application/jsoncharset=UTF-8'
    let content = ''
    await axios({
      method: 'get',
      url: url
    }).then(res => {
      console.log(`获取文件成功: ${name}`)
      content = res.data
    }).catch(err => {
      console.log('获取签到文件失败: ', err.message)
    })

    resovle(content)
  })
}

async function downFile(url) {
  return new Promise(async (resovle) => {
    let name = fileName(url)
    let local = ''
    await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    }).then(res => {
      const rs = res.data
      local = `${name}`
      const ws = fs.createWriteStream(path.join(__dirname, 'scripts', local))
      rs.pipe(ws)
      console.log(`下载文件成功: ${name}`)
    }).catch(res => {
      console.log(`下载文件失败: ${name}`)
    })

    resovle(local)
  })
}

function fileName(url) {
  if (url) {
    let pos = url.lastIndexOf("/")
    if (pos === -1) {
      pos = url.lastIndexOf("\\")
    }
    return url.substr(pos + 1)
  }
  return ""
}
