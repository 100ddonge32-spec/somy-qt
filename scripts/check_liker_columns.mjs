import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
    console.log('Checking columns for community_posts...')
    const { data: communityCols, error: communityErr } = await supabase
        .from('community_posts')
        .select('*')
        .limit(1)

    if (communityErr) {
        console.error('Error checking community_posts:', communityErr.message)
    } else if (communityCols && communityCols.length > 0) {
        console.log('community_posts columns:', Object.keys(communityCols[0]))
        if (Object.keys(communityCols[0]).includes('liker_ids')) {
            console.log('✅ liker_ids exists in community_posts')
        } else {
            console.log('❌ liker_ids MISSING in community_posts')
        }
    } else {
        console.log('No data in community_posts to check columns.')
    }

    console.log('\nChecking columns for thanksgiving_diaries...')
    const { data: thanksgivingCols, error: thanksgivingErr } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .limit(1)

    if (thanksgivingErr) {
        console.error('Error checking thanksgiving_diaries:', thanksgivingErr.message)
    } else if (thanksgivingCols && thanksgivingCols.length > 0) {
        console.log('thanksgiving_diaries columns:', Object.keys(thanksgivingCols[0]))
        if (Object.keys(thanksgivingCols[0]).includes('liker_ids')) {
            console.log('✅ liker_ids exists in thanksgiving_diaries')
        } else {
            console.log('❌ liker_ids MISSING in thanksgiving_diaries')
        }
    } else {
        console.log('No data in thanksgiving_diaries to check columns.')
    }
}

checkColumns()
