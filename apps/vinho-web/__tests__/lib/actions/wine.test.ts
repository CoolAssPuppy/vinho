import { searchWines, getWineDetails, addTasting, getUserTastings } from '@/lib/actions/wine'
import { createServerSupabase } from '@/lib/supabase-server'

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Wine Actions', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('searchWines', () => {
    it('searches for wines by name', async () => {
      const mockWines = [
        { id: '1', name: 'Opus One', producer: { name: 'Opus One Winery' } },
        { id: '2', name: 'La Tâche', producer: { name: 'DRC' } },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockWines, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await searchWines('opus')

      expect(mockSupabase.from).toHaveBeenCalledWith('wines')
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%opus%')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(result).toEqual(mockWines)
    })

    it('throws error when search fails', async () => {
      const error = new Error('Search failed')
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(searchWines('test')).rejects.toThrow('Search failed')
    })
  })

  describe('getWineDetails', () => {
    it('retrieves complete wine details', async () => {
      const mockWine = {
        id: '1',
        name: 'Opus One',
        producer: {
          name: 'Opus One Winery',
          website: 'https://opusonewinery.com',
          region: {
            name: 'Napa Valley',
            country: 'USA',
          },
        },
        vintages: [
          {
            id: 'v1',
            year: 2019,
            abv: 14.5,
          },
        ],
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWine, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await getWineDetails('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('wines')
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
      expect(mockQuery.single).toHaveBeenCalled()
      expect(result).toEqual(mockWine)
    })
  })

  describe('addTasting', () => {
    it('adds a new tasting for authenticated user', async () => {
      const mockUser = { id: 'user-123' }
      const mockTasting = {
        id: 't1',
        vintage_id: 'v1',
        user_id: 'user-123',
        notes: 'Excellent wine',
        verdict: 92,
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTasting, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await addTasting('v1', 'Excellent wine', 92)

      expect(mockSupabase.from).toHaveBeenCalledWith('tastings')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        vintage_id: 'v1',
        user_id: 'user-123',
        notes: 'Excellent wine',
        verdict: 92,
        tasted_at: expect.any(String),
      })
      expect(result).toEqual(mockTasting)
    })

    it('throws error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      await expect(addTasting('v1', 'Notes', 90)).rejects.toThrow('Not authenticated')
    })
  })

  describe('getUserTastings', () => {
    it('retrieves user tastings ordered by date', async () => {
      const mockUser = { id: 'user-123' }
      const mockTastings = [
        {
          id: 't1',
          notes: 'Great wine',
          verdict: 95,
          vintage: {
            year: 2019,
            wine: { name: 'Opus One' },
          },
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTastings, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await getUserTastings()

      expect(mockSupabase.from).toHaveBeenCalledWith('tastings')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockQuery.order).toHaveBeenCalledWith('tasted_at', { ascending: false })
      expect(result).toEqual(mockTastings)
    })
  })
})