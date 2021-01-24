'use strict'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
    // .create: Creates a new `User` record.
    const newUser = await prisma.user.create({
        data: {
            name: 'Ryohei',
            email: 'ryohe@example.com',
            posts: { // nested writes (i.e. creating both a `User` and `Post` record in the same query)
                create: {
                    title: 'Hello Prisma!'
                },
            },
        },
    })
    console.log('Created new user:', newUser)

    // `findMany`: reads all existing `User` records from the database
    const allUsers = await prisma.user.findMany({
        include: { posts: true }, // additionally loads the related `Post` records for each `User` record
    })
    console.log('All users: ')
    console.dir(allUsers, { depth: null })
}

main()
.catch((e) => console.error(e))
.finally(async () => await prisma.$disconnect())  // close any open database connections