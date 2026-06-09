# docker.io

``使用worker.js``

这个项目是一个基于 Cloudflare Workers 的 Docker 镜像代理工具。它能够中转对 Docker 不算ub ghrc 官方镜像仓库的请求，解决一些访问限制和加速访问的问题。

智能识别食用指南

输入格式	输入示例	自动跳转至

普通镜像/关键词	nginx 或 mysql	Docker Hub 官方搜索

GitHub 镜像 (GHCR)	ghcr.io/username/image	GitHub Packages 精准搜索

Quay 镜像	quay.io/username/image	Quay.io 官方精准搜索

🚀 终端拉取加速小窍门

找到镜像后，在本地执行 docker pull 时，将官方域名替换为本站域名 registry-1.docker.io 即可享受高速代理加速。

DockerHub

示例：

docker pull

registry-1.docker.io/library/nginx:latest


GHCR

示例：

docker pull

registry-1.docker.io/username/image:tag
