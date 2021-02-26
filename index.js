const axios = require('axios')
const fs = require('fs')
const path = require('path')

const scripts = []

const gallyJson = [{
    json: "https://jdsharedresourcescdn.azureedge.net/jdresource/lxk0301_gallery.json",
    cdn: "https://jdsharedresourcescdn.azureedge.net/jdresource"
}]


!(async() => {
    console.time('github-to-cos')
    console.log('====== start github-to-cos =====\n')
    let ok = await initConfig()
    // console.log('获取脚本列表', scripts)
    if (ok) {
        await main()
    }
    // await main()
    console.log('\n====== end github-to-cos =====')
    console.timeEnd('github-to-cos')
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
        }
    }

    if (scripts.length === 0) {
        console.log('脚本列表为空')
        return false
    }

    return true
}


async function main() {
    console.log('准备上传文件 github =======')
}

async function restFile(url) {
    return new Promise(async(resovle) => {
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
    return new Promise(async(resovle) => {
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
