import { NextRequest, NextResponse } from "next/server"

const COLLECTION_SIZE = 8888
const COLLECTION_NAME = "Matchstick Countdown"
const COLLECTION_DESCRIPTION = "A unique collection of 8,888 NFTs featuring the Matchstick Countdown - an interactive, ever-burning digital flame."
const MEDIA_URL = "https://matchstick-countdown-ryankagygamesto.replit.app"
const EXTERNAL_URL = "https://matchstick-countdown-ryankagygamesto.replit.app"

function generateMetadata(tokenId: number) {
  return {
    name: `${COLLECTION_NAME} #${tokenId}`,
    description: COLLECTION_DESCRIPTION,
    image: MEDIA_URL,
    animation_url: MEDIA_URL,
    external_url: EXTERNAL_URL,
    attributes: [
      { trait_type: "Burned", value: "False" },
      { trait_type: "First Lit", value: -1, display_type: "number" },
      { trait_type: "Days Lit", value: 0, display_type: "number" },
      { trait_type: "Fires Started", value: 0, display_type: "number" },
    ],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tokenId = parseInt(params.id, 10)

  if (isNaN(tokenId) || tokenId < 1 || tokenId > COLLECTION_SIZE) {
    return NextResponse.json(
      { error: `Token ID must be between 1 and ${COLLECTION_SIZE}` },
      { status: 404 }
    )
  }

  const metadata = generateMetadata(tokenId)

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
