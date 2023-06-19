import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request) => {
    const bodySchema = z.object({
      code: z.string(),
    })

    const { code } = bodySchema.parse(request.body)

    // Busco o AccessToken pelo Code que veio quando autorizei pelo OAuth, vindo do front
    const accessTokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          Accept: 'application/json', // O Formato que eu quero que ele me retorne a resposta dessa requisição
        },
      },
    )

    // Pego o AcessToken
    const { access_token } = accessTokenResponse.data

    // Busco os dados do usuário do Github passando o AccessToken que obtive na autenticação
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    // Crio um schema para trazer somente as informações que tenho interesse.
    const userSchema = z.object({
      id: z.number(),
      login: z.string(),
      name: z.string(),
      avatar_url: z.string().url(),
    })

    const userInfo = userSchema.parse(userResponse.data)

    // Valido se esse usuário já existe no banco.
    let user = await prisma.user.findUnique({
      where: {
        githubId: userInfo.id,
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: userInfo.id,
          login: userInfo.login,
          name: userInfo.name,
          avatarUrl: userInfo.avatar_url,
        },
      })
    }

    // Ao invés de retornar o usuário, eu retorno um token, com os dados que eu quero que sejam exibidos
    const token = app.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      {
        sub: user.id, // Refere-se a quem esse token pertence
        expiresIn: '30d', // Tempo de expiração, para que seja necessário fazer login novamente
      },
    )

    return {
      token,
    }
  })
}
