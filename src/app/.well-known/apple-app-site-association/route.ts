import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

/**
 * Universal Links (iOS) — servida sem autenticação em
 * https://uzzapp.uzzai.com.br/.well-known/apple-app-site-association
 *
 * Team ID (2YRXNXGL8K) + Bundle ID (com.uzzai.uzzapp) — mesma conta Apple
 * Developer usada pelo Convoca.
 */
export async function GET() {
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: '2YRXNXGL8K.com.uzzai.uzzapp',
          paths: ['*'],
        },
      ],
    },
  })
}
