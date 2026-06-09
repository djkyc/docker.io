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

// 深色磨砂玻璃风格 + 科技蓝主题色 rgb(64,140,255) + 食用指南表头 rgb(43,62,119)
async function searchInterface(currentHostname) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Docker 镜像智能导航中心</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Docker favicon 图标（浏览器标签页显示） -->
        <link rel="icon" type="image/x-icon" href="https://www.docker.com/favicon.ico">
        <style>
        :root {
            --primary-color: rgb(64, 140, 255);
            --primary-dark: rgb(44, 110, 215);
            --gradient-start: #141e30;
            --gradient-end: #243b55;
            --panel-bg: rgba(255, 255, 255, 0.08);
            --panel-border: rgba(255, 255, 255, 0.12);
            --code-bg: rgba(13, 27, 42, 0.6);
            --text-main: #ffffff;
            --text-muted: rgba(255, 255, 255, 0.75);
            --text-link: rgb(64, 140, 255);
            --table-header-bg: rgb(43, 62, 119);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            padding: 20px;
            color: var(--text-main);
        }
        .container { text-align: center; width: 100%; max-width: 760px; padding: 10px 0; }
        .title { font-size: 2.2em; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
        .subtitle { color: rgba(255, 255, 255, 0.8); font-size: 1.05em; margin-bottom: 30px; }
        
        /* 搜索栏视觉微调 */
        .search-container {
            display: flex; align-items: stretch; width: 100%; max-width: 600px; margin: 0 auto 25px auto;
            height: 54px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); border-radius: 12px; overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        #search-input {
            flex: 1; padding: 0 20px; font-size: 16px; color: #1e293b; border: none; outline: none; background: #ffffff;
        }
        #search-button {
            width: 65px; background-color: var(--primary-color); border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: background 0.2s;
        }
        #search-button:hover { background-color: var(--primary-dark); }
        #search-button svg { stroke: white; fill: none; }
        
        /* 深度调优的食用方法引导板 */
        .guide-panel {
            background: var(--panel-bg);
            border-radius: 14px;
            padding: 24px;
            text-align: left;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--panel-border);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            transition: border-color 0.3s;
        }
        .guide-panel:hover { border-color: rgba(255, 255, 255, 0.2); }
        .guide-title {
            font-size: 1.1em; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
            color: var(--text-link); text-shadow: 0 2px 4px rgba(0,0,0,0.14);
        }
        .guide-table {
            width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.92em;
        }
        .guide-table th, .guide-table td {
            padding: 10px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: left;
        }
        .guide-table th {
            background: var(--table-header-bg);
            font-weight: 600;
            color: rgba(255, 255, 255, 0.95);
        }
        .guide-table td {
            color: var(--text-muted);
        }
        
        .tips { font-size: 0.88em; line-height: 1.65; color: var(--text-muted); border-top: 1px dashed rgba(255, 255, 255, 0.15); padding-top: 16px; }
        .tips b { color: var(--text-link); }
        code { background: var(--code-bg); padding: 3px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #f1f5f9; font-size: 0.92em; border: 1px solid rgba(255, 255, 255, 0.05); }
        .tips code { display: inline-block; margin: 2px 0; background: rgba(0, 0, 0, 0.25); color: var(--text-link); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">🐳 Docker 镜像智能导航</h1>
            <p class="subtitle">键入核心词或完整路径，自动分流检索并指引直达官方源</p>
            
            <div class="search-container">
                <input type="text" id="search-input" placeholder="输入关键词或镜像路径，例如: nginx、ghcr.io/... ">
                <button id="search-button" title="智能跳转搜索">
                    <svg width="20" height="20" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M13 5l7 7-7 7M5 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            </div>
            
            <div class="guide-panel">
                <div class="guide-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    智能识别食用指南
                </div>
                <table class="guide-table">
                    <thead>
                        <tr>
                            <th>输入格式</th>
                            <th>输入示例</th>
                            <th>自动路由目的地</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b>普通镜像/关键词</b></code></td>
                            <td><code>nginx</code> 或 <code>mysql</code></code></code></td>
                            <td>Docker Hub 官方检索中心</code></code></td>
                        </tr>
                        <tr>
                            <td><b>GitHub 镜像路径</b></code></code></td>
                            <td><code>ghcr.io/username/image</code></code></code></code></td>
                            <td>GitHub Packages 对应主页/搜索</code></code></td>
                        </tr>
                        <tr>
                            <td><b>Quay 镜像路径</b></code></code></td>
                            <td><code>quay.io/username/image</code></code></code></code></td>
                            <td>Quay.io 官方搜索中心</code></code></td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="tips">
                    🚀 <b>本地终端拉取（加速小窍门）：</b><br>
                    本页面仅用作日常寻找镜像的快捷导航。在终端部署拉取时，只需将<b>官方源域名</b>无缝替换为本代理站域名 <code>${currentHostname}</code> 即可：<br>
                    <span style="display:block; margin-top:6px;">• DockerHub 镜像加速：<code>docker pull ${currentHostname}/library/nginx:latest</code></span>
                    <span>• GHCR 镜像加速：<code>docker pull ${currentHostname}/username/image:tag</code></span>
                </div>
            </div>
        </div>
        
        <script>
        function performRedirect() {
            let query = document.getElementById('search-input').value.trim();
            if (!query) return;

            if (query.startsWith("docker pull ")) {
                query = query.replace("docker pull ", "").trim();
            }

            if (query.includes("ghcr.io/")) {
                let cleanPath = query.replace("ghcr.io/", "");
                window.open('https://github.com/search?q=' + encodeURIComponent(cleanPath) + '&type=registrypackages', '_blank');
            } else if (query.includes("quay.io/")) {
                let cleanPath = query.replace("quay.io/", "");
                window.open('https://quay.io/search?q=' + encodeURIComponent(cleanPath), '_blank');
            } else {
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

        // ==================== 反代底层逻辑保持 100% 稳健传输不变 ====================
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
    var addtext = envadd.replace(/[	 |"'\r\n]+/g, ',').replace(/,+/g, ',');	
    if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
    return addtext.split(',');
}