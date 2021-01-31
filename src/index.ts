'use strict'

import { PrismaClient } from '@prisma/client'
import express from 'express'

const prisma = new PrismaClient()
const app = express() // express() を call することで Express アプリケーション を作成

app.use(express.json()) // express.json() ミドルウェアを追加：JSON データが Express によって適切に処理されるようにする

// REST API routes will go here
app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany()
    res.json(users)
})

// `/feed`: publish された post の一覧を返す
app.get('/feed', async (req, res) => {
    const posts = await prisma.post.findMany({
        where  : { published: true },
        include: { author   : true } ,
    })
    res.json(posts)
})

// `/post/:id`: 特定の ID の post を返す
app.get(`/post/:id`, async (req, res) => {
    const { id } = req.params // URL path（`/post/:id`）から `id` を読む
    const post = await prisma.post.findFirst({
        where: { id: Number(id) }
    })
    res.json(post)
})

// `/user`: DB に新たに user を作成する
app.post(`/user`, async (req, res) => {
    const result = await prisma.user.create({
        data: { ...req.body } // HTTP リクエストの body から Prisma Client の `create` クエリに値を渡す
    })
    res.json(result)
})

// `/post`: DB に新たに post を（ドラフトとして）作成する
app.post(`/post`, async (req, res) => {
    const { title, content, authorEmail } = req.body // .post(`/user`) とは違い、まず body の中身を展開
    const result = await prisma.post.create({
        data: {
            title,
            content,
            published: false,
            author: { connect: { email: authorEmail }},
        },
    })
    res.json(result)
})

// `/post/publish/:id` (PUT): ID によって指定された post を公開する（published を true にする）
app.put(`/post/publish/:id`, async (req, res) => {
    const { id } = req.params
    const post = await prisma.post.update({
        where: { id: Number(id) },
        data: { published: true },
    })
    res.json(post)
})

// `/post/:id` (DELETE): ID によって指定された post を削除する
app.delete(`/post/:id`, async (req, res) => {
    const { id } = req.params
    const post = await prisma.post.delete({
        where: { id: Number(id) },
    })
    res.json(post)
})

app.listen(3000, () => {
    console.log('REST API server ready at: http://localhost:3000')
})