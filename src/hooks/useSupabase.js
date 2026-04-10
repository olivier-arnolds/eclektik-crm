import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useTable(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(table).select(options.select || '*')
    if (options.eq) {
      for (const [col, val] of options.eq) {
        query = query.eq(col, val)
      }
    }
    if (options.inFilter) query = query.in(options.inFilter[0], options.inFilter[1])
    if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true })
    if (options.limit) query = query.limit(options.limit)
    const { data: rows, error } = await query
    if (!error && rows) setData(rows)
    setLoading(false)
    return { data: rows, error }
  }, [table, JSON.stringify(options)])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

// Mutation helpers
export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select()
  return { data: data?.[0], error }
}

export async function updateRow(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
  return { data: data?.[0], error }
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  return { error }
}
