import * as fs from "fs"
import * as path from "path"

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

async function generateAllMetadata() {
  const outputDir = path.join(process.cwd(), "public", "nft-metadata")
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log(`Generating ${COLLECTION_SIZE} NFT metadata files...`)
  console.log(`Output directory: ${outputDir}`)
  console.log("")

  const batchSize = 500
  let generated = 0

  for (let i = 1; i <= COLLECTION_SIZE; i++) {
    const metadata = generateMetadata(i)
    const filePath = path.join(outputDir, `${i}.json`)
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2))
    generated++

    if (generated % batchSize === 0) {
      console.log(`Generated ${generated}/${COLLECTION_SIZE} files...`)
    }
  }

  console.log("")
  console.log(`Successfully generated ${COLLECTION_SIZE} metadata files!`)
  console.log(`Files saved to: ${outputDir}`)
  console.log("")
  console.log("Sample metadata for token #1:")
  console.log(JSON.stringify(generateMetadata(1), null, 2))
}

generateAllMetadata().catch(console.error)
