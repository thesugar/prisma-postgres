# prisma-postgres

from: [How To Build a REST API with Prisma and PostgreSQL](https://www.digitalocean.com/community/tutorials/how-to-build-a-rest-api-with-prisma-and-postgresql)

## 環境

- Node.js v10〜（v12.14.0）
- Docker

## 手順

### Step1. プロジェクト作成

```bash
mkdir {project-name} && cd {project-name}
```

```bash
yarn init -y
```

```bash
yarn add --dev typescript ts-node @types/node
```

```bash
touch tsconfig.json
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "lib": ["esnext"],
    "esModuleInterop": true
  }
}
```

### Step2. Docker で PostgreSQL をセットアップして Prisma と接続する

```bash
yarn add --dev @prisma/cli
```

Prisma CLI はグローバルインストールではなくローカル（→本番 vs ローカルの意味のローカルではなく、マシン上においてグローバルインストールするのではなくプロジェクト単位でインストールするという意味）インストールする。そうすることで、複数の Prisma プロジェクトが（同じマシン上に）複数あってもバージョンのコンフリクトが起こらない。

```bash
touch docker-compose.yml
```

```yml
version: '3.8'
services:
  postgres:
    image: postgres:10.3
    restart: always
    environment:
      - POSTGRES_USER={user}
      - POSTGRES_PASSWORD={password}
    volumes:
      - postgres:/var/lib/postgresql/data
    ports:
      - '5432:5432'
volumes:
  postgres:
```

以下で PostgreSQL が起動する（up したあと、`docker ps` で確認できる）。

```bash
docker-compose up -d
```

DB が動いていれば、Prisma をセットアップすることができる。Prisma CLI を使って以下のコマンドを実行する。

```bash
npx prisma init
```

`npx` をつけて Prisma CLI を使うことで、プロジェクトにローカルインストールしたバージョンを使うように明示できる。

これで `schema.prisma` と `.env` が自動で作成される。

- `schema.prisma`: Prisma プロジェクトの主要な設定ファイル（データモデルを含む）。
- `.env`: データベース接続 URL を定義する dotenv ファイル。

`.env` ファイルは以下のように編集すること。

```
// .env
DATABASE_URL="postgresql://{username}:{password}@localhost:5432/my-blog?schema=public"
```

### Step3. データモデルを定義し、DB テーブルを作成する

Prisma スキーマファイルで[データモデル](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-schema/data-model)を作成する。データモデルは [Prisma Migrate](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-migrate) によって DB にマッピングされる。つまり、SQL 文が生成/送信され、データモデルに対応するテーブルが DB 上に作成される。

Prisma はアプリケーションのデータの形を決定するために独自の[データモデリング言語（DML）](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-schema#syntax) を使っている。

`schema.prisma` に以下のようにデータモデルを追加する。

```
model User {
  id    Int     @default(autoincrement()) @id
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @default(autoincrement()) @id
  title     String
  content   String?
  published Boolean @default(false)
  author    User?   @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

上記では、2 つのモデル（`User` と `Post`）を定義した。それぞれ複数のフィールド（モデルのプロパティを表す）を持つ。これらのモデルは DB 上のテーブルにマッピングされる。フィールドは個々のカラムを表す。

ここまで来たら、Prisma Migrate を使用して、データモデルに対応するテーブルを作成する。

```bash
npx prisma migrate dev --name "init" --preview-feature
```

このコマンドによって、ファイルシステム上に新しい SQL マイグレーションが作成され、それが DB に送信される。

- `--name "init"`: マイグレーションの名前を特定するもの（ファイルシステム上に作成されるマイグレーションフォルダの名前として使用される。具体的には `migrations/20210123131736_init` のようになる）。
- `--preview-feature`: Prisma Migrate は現在プレビュー版であるため、このフラグが必要。

`--create-only` オプションを追加して `prisma migrate dev` すれば、生成される SQL マイグレーションファイルをカスタマイズすることも可能らしい。

### Step4. Prisma Client Queryies を使ってみる

Prisma Client は、自動で生成され、かつ型安全なクエリビルダー。Node.js あるいは TypeScript アプリから programmatically に DB にデータを読み書きするために使われる。

データベースアクセスのために、REST API ルーティングで使うことができる。従来の ORM やプレーンな SQL クエリ、もしくはカスタマイズされたデータアクセスレイヤー、その他 DB と通信するものを置き換えることができる。

まずは、Prisma Client をインストールして、Prisma Client を使って送信できるクエリに慣れることを目的として簡単なコードを書いてみる。

```bash
yarn add @prisma/client
```

```bash
mkdir src && touch src/index.ts
```

Prisma Client のクエリは Promise を返す。したがって、`async` 関数の中でクエリを送信する必要がある。

```ts
// src/index.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Prisma Client のクエリは以下のようになる
  const newUser = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@prisma.io',
      posts: {
        create: {
          title: 'Hello World',
        },
      },
    },
  })
  console.log('Created new user: ', newUser)

  const allUsers = await prisma.user.findMany({
    include: { posts: true },
  })
  console.log('All users: ')
  console.dir(allUsers, { depth: null })
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
```

- `create`: 新しい `User` レコードを作成する。上記コードでは [nested write](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/relation-queries#nested-writes) を使っている。つまり、同一のクエリで `User` と `Post` 両方のレコードを作成できるということ。
- `findMany`: DB から、すべての既存の `User` レコードを読み取る。`include` オプションを使うことで、各 `User` レコードについて、関連する `Post` レコードをも読み込むことができる。

以下のコマンドでスクリプトを実行。

```bash
npx ts-node src/index.ts
```

### Step5. REST API ルーティングを実装する

Express をインストールして、REST API ルーティングを実装する。まずはシンプルに、`GET` リクエストを使って API からすべての user を取得してみる。user のデータは Prisma Client を使ってデータベースから取得される。

まずは以下のコマンドで Express と TypeScript 用の依存パッケージをインストールする。

```bash
yarn add express
yarn add --dev @types/express
```

続いて、`index.ts` を以下のように書き換える。

```ts
import { PrismaClient } from '@prisma/client'
import express from 'express'

// PrismaClient をインスタンス化
const prisma = new PrismaClient()
// Express アプリケーションを作成
const app = express()

// express.json() ミドルウェアを追加して、JSON データを適切に扱えるようにする
app.use(express.json())

// ... your REST API routes will go here

// 3000 番ポートでサーバーを立てる
app.listen(3000, () =>
  console.log('REST API server ready at: http://localhost:3000'),
)
```

さらに、`// ... your REST API routes will go here` の部分を以下コードに書き換える。

```ts
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany()
  res.json(users)
})
```

ここまでできたら保存して、以下コマンドでローカルの web サーバーを立てる。

```bash
yarn ts-node src/index.ts
# npx ts-node src/index.ts
```

`/users` のルーティングにアクセスするためには `http://localhost:3000/users` にブラウザからアクセスする（もしくは curl を使ってリクエストする: `curl http://localhost:3000/users`）。

そうすると、以下のような出力が得られる。

```
[{"id":1,"email":"alice@prisma.io","name":"Alice"}]
```

ここでは `posts` の配列は含まれていないことに注意。これは、`findMany` を呼ぶときに `include` オプションを渡していないから。