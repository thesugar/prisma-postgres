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

app.listen(3000, () => {
    console.log('REST API server ready at: http://localhost:3000')
})