
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('Checking vendas table columns...')
    const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching from vendas:', error)
    } else {
        console.log('Vendas columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in table')
    }

    console.log('\nChecking other potential tables...')
    const tables = ['pontos', 'caixa_movimentos', 'caixas']
    for (const table of tables) {
        const { error: tError } = await supabase.from(table).select('*').limit(1)
        if (tError) {
            console.log(`Table ${table} might not exist or error:`, tError.message)
        } else {
            console.log(`Table ${table} exists.`)
        }
    }
}

checkSchema()
