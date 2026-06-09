// _worker.js

// Docker镜像仓库主机地址
let hub_host = 'registry-1.docker.io';
// Docker认证服务器地址
const auth_url = 'https://auth.docker.io';

let 屏蔽爬虫UA = ['netcraft'];

// 根据主机名选择对应的上游地址
function routeByHosts(host) {
    const routes = {
        "quay": "quay.io",
        "gcr": "gcr.io",
        "k8s-gcr": "k8s.gcr.io",
        "k8s": "registry.k8s.io",
        "ghcr": "ghcr.io",
        "cloudsmith": "docker.cloudsmith.io",
        "nvcr": "nvcr.io",
        "test": "registry-1.docker.io",
    };

    if (host in routes) return [routes[host], false];
    else return [hub_host, true];
}

/** @type {RequestInit} */
const PREFLIGHT_INIT = {
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
}

function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status, headers })
}

function newUrl(urlStr, base) {
    try {
        return new URL(urlStr, base);
    } catch (err) {
        console.error(err);
        return null
    }
}

async function nginx() {
    return `
    <!DOCTYPE html>
    <html>
    <head><title>Welcome to nginx!</title><style>body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }</style></head>
    <body>
    <h1>Welcome to nginx!</h1>
    <p>If you see this page, the nginx web server is successfully installed and working.</p>
    </body>
    </html>`;
}

// 明亮蓝色渐变风格 + Docker 官方 Favicon + 智能双重精准跳转（GHCR & Quay）+ 绝色双重高亮排版对齐
async function searchInterface(currentHostname) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Docker Hub 镜像搜索</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/x-icon" href="https://www.docker.com/favicon.ico">
        <style>
        :root {
            --primary-color: #0066ff;
            --primary-dark: #0052cc;
            --gradient-start: #1a90ff;
            --gradient-end: #003eb3;
            --text-color: #ffffff;
            --card-bg: #ffffff;
            --text-dark: #1e293b;
            --text-muted: #475569;
            --border-light: #e2e8f0;
            --code-bg: #f1f5f9;
            /* 绝色高亮蓝 */
            --brand-blue: #0052cc; 
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
            padding: 20px;
            color: var(--text-color);
        }
        .container {
            text-align: center;
            width: 100%;
            max-width: 800px;
            padding: 20px;
            margin: 0 auto;
        }
        .title {
            font-size: 2.3em;
            margin-bottom: 10px;
            font-weight: 700;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }
        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1em;
            margin-bottom: 25px;
        }
        .search-container {
            display: flex;
            align-items: stretch;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            height: 55px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border-radius: 12px;
            overflow: hidden;
        }
        #search-input {
            flex: 1;
            padding: 0 20px;
            font-size: 16px;
            border: none;
            outline: none;
            color: var(--text-dark);
            background: #ffffff;
        }
        #search-input::placeholder {
            color: #94a3b8;
        }
        #search-button {
            width: 60px;
            background-color: var(--primary-color);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        #search-button:hover {
            background-color: var(--primary-dark);
        }
        #search-button svg {
            stroke: white;
            width: 20px;
            height: 20px;
        }
        .guide-panel {
            background: var(--card-bg);
            border-radius: 16px;
            padding: 24px;
            margin-top: 30px;
            text-align: left;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        .guide-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--primary-color);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .guide-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .guide-table th,
        .guide-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-light);
            text-align: left;
        }
        .guide-table th {
            background: #f8fafc;
            font-weight: 600;
            color: var(--primary-dark);
        }
        .guide-table td {
            color: var(--text-muted);
        }
        code {
            background: var(--code-bg);
            padding: 2px 6px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.9em;
            color: #d63369;
        }
        .tips {
            font-size: 0.9rem;
            line-height: 1.6;
            color: var(--text-muted);
            border-top: 1px solid var(--border-light);
            padding-top: 16px;
            margin-top: 8px;
        }
        .tips strong {
            color: var(--primary-color);
        }
        
        /* 终端展示控制块 */
        .example-block {
            background: #f8fafc;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            padding: 14px 16px;
            margin-top: 12px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
            font-size: 0.88rem;
            line-height: 2.0;
            overflow-x: auto;
            color: #334155;
        }
        .example-line {
            display: flex;
            align-items: center;
            white-space: nowrap;
        }
        /* 固定标识宽度，实现绝对对齐 */
        .brand-lbl {
            display: inline-block;
            width: 100px;
        }
        /* 绝色字体标记：加粗、改高亮深蓝 */
        .brand-tag {
            color: var(--brand-blue);
            font-weight: 700;
        }
        /* 固定命令前缀宽度，让后续的地址也100%切齐 */
        .cmd-prefix {
            display: inline-block;
            width: 95px;
        }
        @media (max-width: 640px) {
            .title { font-size: 1.8rem; }
            .guide-table th, .guide-table td { padding: 8px 12px; font-size: 0.85rem; }
            .example-block { font-size: 0.75rem; }
            .example-line { white-space: pre-wrap; word-break: break-all; align-items: flex-start; flex-direction: column; }
            .brand-lbl, .cmd-prefix { width: auto; display: inline; }
        }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">🐳 Docker Hub 镜像搜索</h1>
            <p class="subtitle">快速查找、下载和部署 Docker 容器镜像</p>
            <div class="search-container">
                <input type="text" id="search-input" placeholder="输入关键词搜索镜像，如: nginx, mysql, redis...">
                <button id="search-button" title="搜索">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 5l7 7-7 7M5 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            
            <div class="guide-panel">
                <div class="guide-title">
                    📖 智能识别食用指南
                </div>
                <table class="guide-table">
                    <thead>
                        <tr><th>输入格式</th><th>输入示例</th><th>自动跳转至</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>普通镜像/关键词</strong></td><td><code>nginx</code> 或 <code>mysql</code></td><td>Docker Hub 官方搜索</td></tr>
                        <tr><td><strong>GitHub 镜像 (GHCR)</strong></td><td><code>ghcr.io/username/image</code></td><td>GitHub Packages 精准搜索</td></tr>
                        <tr><td><strong>Quay 镜像</strong></td><td><code>quay.io/username/image</code></td><td>Quay.io 官方精准搜索</td></tr>
                    </tbody>
                </table>
                <div class="tips">
                    🚀 <strong>终端拉取加速小窍门</strong><br>
                    找到镜像后，在本地执行 <code>docker pull</code> 时，将官方域名替换为本站域名 <strong>${currentHostname}</strong> 即可享受高速代理加速。
                    
                    <div class="example-block">
                        <div class="example-line">• <span class="brand-lbl"><span class="brand-tag">DockerHub</span></span> 示例：<span class="cmd-prefix"><span class="brand-tag">docker pull</span></span> ${currentHostname}/library/nginx:latest</div>
                        <div class="example-line">• <span class="brand-lbl"><span class="brand-tag">GHCR</span></span> 示例：<span class="cmd-prefix"><span class="brand-tag">docker pull</span></span> ${currentHostname}/username/image:tag</div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        function performRedirect() {
            let query = document.getElementById('search-input').value.trim();
            if (!query) return;
            
            // 去除可能携带的 docker pull 前缀
            if (query.startsWith("docker pull ")) {
                query = query.replace("docker pull ", "").trim();
            }
            
            // 1. 处理 GHCR.io 镜像跳转
            if (query.includes("ghcr.io/")) {
                let cleanPath = query.replace("ghcr.io/", "").trim();
                if (cleanPath.includes("/")) {
                    let parts = cleanPath.split("/");
                    let username = parts[0];
                    let repoName = parts[1].split(":")[0]; 
                    window.open('https://github.com/' + username + '?tab=packages&q=' + encodeURIComponent(repoName), '_blank');
                } else {
                    window.open('https://github.com/search?q=' + encodeURIComponent(cleanPath) + '&type=registrypackages', '_blank');
                }
            } 
            // 2. 处理 Quay.io 镜像跳转
            else if (query.includes("quay.io/")) {
                let cleanPath = query.replace("quay.io/", "").trim();
                if (cleanPath.includes("/")) {
                    let parts = cleanPath.split("/");
                    let username = parts[0];
                    let repoName = parts[1].split(":")[0];
                    window.open('https://quay.io/repository/' + username + '/' + repoName, '_blank');
                } else {
                    window.open('https://quay.io/search?q=' + encodeURIComponent(cleanPath), '_blank');
                }
            } 
            // 3. 默认跳转到 DockerHub 搜索
            else {
                window.open('https://hub.docker.com/search?q=' + encodeURIComponent(query), '_blank');
            }
        }
        document.getElementById('search-button').addEventListener('click', performRedirect);
        document.getElementById('search-input').addEventListener('keypress', function(e) { if (e.key === 'Enter') performRedirect(); });
        window.addEventListener('load', function() { document.getElementById('search-input').focus(); });
        </script>
    </body>
    </html>`;
    return html;
}

export default {
    async fetch(request, env, ctx) {
        const getReqHeader = (key) => request.headers.get(key);
        let url = new URL(request.url);

        if (url.pathname === "/search" || url.pathname === "/repo") {
            return Response.redirect(`https://${url.hostname}/`, 302);
        }

        const userAgentHeader = request.headers.get('User-Agent');
        const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
        if (env.UA) 屏蔽爬虫UA = 屏蔽爬虫UA.concat(await ADD(env.UA));
        const workers_url = `https://${url.hostname}`;

        const ns = url.searchParams.get('ns');
        const hostname = url.searchParams.get('hubhost') || url.hostname;
        const hostTop = hostname.split('.')[0];

        let checkHost; 
        if (ns) {
            if (ns === 'docker.io') { hub_host = 'registry-1.docker.io'; } 
            else { hub_host = ns; }
        } else {
            checkHost = routeByHosts(hostTop);
            hub_host = checkHost[0]; 
        }

        const fakePage = checkHost ? checkHost[1] : false;
        url.hostname = hub_host;
        const hubParams = ['/v1/search', '/v1/repositories'];

        if (屏蔽爬虫UA.some(fxxk => userAgent.includes(fxxk)) && 屏蔽爬虫UA.length > 0) {
            return new Response(await nginx(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        } else if ((userAgent && userAgent.includes('mozilla')) || hubParams.some(param => url.pathname.includes(param))) {
            if (url.pathname == '/') {
                if (env.URL302) { return Response.redirect(env.URL302, 302); } 
                else if (env.URL) {
                    if (env.URL.toLowerCase() == 'nginx') {
                        return new Response(await nginx(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
                    } else return fetch(new Request(env.URL, request));
                } else {
                    if (fakePage) return new Response(await searchInterface(url.hostname), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
                }
            } else {
                if (url.pathname.startsWith('/v1/')) { url.hostname = 'index.docker.io'; } 
                else if (fakePage) { url.hostname = 'hub.docker.com'; }
                if (url.searchParams.get('q')?.includes('library/') && url.searchParams.get('q') != 'library/') {
                    const search = url.searchParams.get('q');
                    url.searchParams.set('q', search.replace('library/', ''));
                }
                return fetch(new Request(url, request));
            }
        }

        if (!/%2F/.test(url.search) && /%3A/.test(url.toString())) {
            let modifiedUrl = url.toString().replace(/%3A(?=.*?&)/, '%3Alibrary%2F');
            url = new URL(modifiedUrl);
        }

        if (url.pathname.includes('/token')) {
            let token_parameter = {
                headers: {
                    'Host': 'auth.docker.io',
                    'User-Agent': getReqHeader("User-Agent"),
                    'Accept': getReqHeader("Accept"),
                    'Connection': 'keep-alive'
                }
            };
            return fetch(new Request(auth_url + url.pathname + url.search, request), token_parameter);
        }

        if (hub_host == 'registry-1.docker.io' && /^\/v2\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname) && !/^\/v2\/library/.test(url.pathname)) {
            url.pathname = '/v2/library/' + url.pathname.split('/v2/')[1];
        }

        if (url.pathname.startsWith('/v2/') && (url.pathname.includes('/manifests/') || url.pathname.includes('/blobs/') || url.pathname.includes('/tags/') || url.pathname.endsWith('/tags/list'))) {
            let repo = '';
            const v2Match = url.pathname.match(/^\/v2\/(.+?)(?:\/(manifests|blobs|tags)\/)/);
            if (v2Match) { repo = v2Match[1]; }
            if (repo) {
                const tokenUrl = `${auth_url}/token?service=registry.docker.io&scope=repository:${repo}:pull`;
                const tokenRes = await fetch(tokenUrl, { headers: { 'User-Agent': getReqHeader("User-Agent") } });
                const tokenData = await tokenRes.json();
                const token = tokenData.token;
                let parameter = {
                    headers: {
                        'Host': hub_host,
                        'User-Agent': getReqHeader("User-Agent"),
                        'Authorization': `Bearer ${token}`
                    },
                    cacheTtl: 3600
                };
                if (request.headers.has("X-Amz-Content-Sha256")) { parameter.headers['X-Amz-Content-Sha256'] = getReqHeader("X-Amz-Content-Sha256"); }
                let original_response = await fetch(new Request(url, request), parameter);
                let response_headers = original_response.headers;
                let new_response_headers = new Headers(response_headers);
                if (new_response_headers.get("Www-Authenticate")) {
                    new_response_headers.set("Www-Authenticate", response_headers.get("Www-Authenticate").replace(new RegExp(auth_url, 'g'), workers_url));
                }
                if (new_response_headers.get("Location")) { return httpHandler(request, new_response_headers.get("Location"), hub_host); }
                return new Response(original_response.body, { status: original_response.status, headers: new_response_headers });
            }
        }

        let parameter = {
            headers: {
                'Host': hub_host,
                'User-Agent': getReqHeader("User-Agent"),
                'Accept': getReqHeader("Accept")
            },
            cacheTtl: 3600 
        };

        if (request.headers.has("Authorization")) { parameter.headers.Authorization = getReqHeader("Authorization"); }
        if (request.headers.has("X-Amz-Content-Sha256")) { parameter.headers['X-Amz-Content-Sha256'] = getReqHeader("X-Amz-Content-Sha256"); }

        let original_response = await fetch(new Request(url, request), parameter);
        let new_response_headers = new Headers(original_response.headers);

        if (new_response_headers.get("Www-Authenticate")) {
            new_response_headers.set("Www-Authenticate", original_response.headers.get("Www-Authenticate").replace(new RegExp(auth_url, 'g'), workers_url));
        }
        if (new_response_headers.get("Location")) { return httpHandler(request, new_response_headers.get("Location"), hub_host); }

        return new Response(original_response.body, { status: original_response.status, headers: new_response_headers });
    },
};

function httpHandler(req, pathname, baseHost) {
    if (req.method === 'OPTIONS' && req.headers.has('access-control-request-headers')) { return new Response(null, PREFLIGHT_INIT); }
    const reqHdrNew = new Headers(req.headers);
    reqHdrNew.delete("Authorization"); 
    const urlObj = newUrl(pathname, 'https://' + baseHost);
    return proxy(urlObj, { method: req.method, headers: reqHdrNew, redirect: 'follow', body: req.body }, '');
}

async function proxy(urlObj, reqInit, rawLen) {
    const res = await fetch(urlObj.href, reqInit);
    const resHdrNew = new Headers(res.headers);
    resHdrNew.set('access-control-expose-headers', '*');
    resHdrNew.set('access-control-allow-origin', '*');
    resHdrNew.set('Cache-Control', 'max-age=1500');
    resHdrNew.delete('content-security-policy');
    resHdrNew.delete('content-security-policy-report-only');
    resHdrNew.delete('clear-site-data');
    return new Response(res.body, { status: res.status, headers: resHdrNew });
}

async function ADD(envadd) {
    var addtext = envadd.replace(/[  |"'\r\n]+/g, ',').replace(/,+/g, ','); 
    if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
    return addtext.split(',');
}