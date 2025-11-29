import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseService } from '../supabase/supabase.service'
import axios from 'axios'

@Injectable()
export class FitbitService {
  private readonly logger = new Logger(FitbitService.name)
  private readonly FITBIT_API_BASE = 'https://api.fitbit.com'

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  /**
   * Save or update Fitbit tokens for a user
   */
  async saveTokens(userId: string, fitbitUserId: string, accessToken: string, refreshToken: string, expiresIn: number) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    const { data, error } = await this.supabase.getClient()
      .from('fitbit_tokens')
      .upsert({
        user_id: userId,
        fitbit_user_id: fitbitUserId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' })
      .select()

    if (error) {
      this.logger.error(`Failed to save Fitbit tokens: ${error.message}`)
      throw new Error('Failed to save Fitbit tokens')
    }

    this.logger.log(`Fitbit tokens saved for user ${userId}`)
    return data
  }

  /**
   * Get Fitbit tokens for a user
   */
  async getTokens(userId: string) {
    const { data, error } = await this.supabase.getClient()
      .from('fitbit_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      this.logger.error(`Failed to get Fitbit tokens: ${error.message}`)
      return null
    }

    return data
  }

  /**
   * Get all users with Fitbit tokens
   */
  async getAllUsersWithTokens() {
    const { data, error } = await this.supabase.getClient()
      .from('fitbit_tokens')
      .select('*')

    if (error) {
      this.logger.error(`Failed to get all Fitbit tokens: ${error.message}`)
      return []
    }

    return data
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(userId: string) {
    const tokens = await this.getTokens(userId)
    if (!tokens) {
      throw new Error('No tokens found for user')
    }

    const clientId = this.config.get<string>('FITBIT_CLIENT_ID')
    const clientSecret = this.config.get<string>('FITBIT_CLIENT_SECRET')
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    try {
      const response = await axios.post(
        'https://api.fitbit.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }),
        {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      const { access_token, refresh_token, expires_in, user_id } = response.data

      await this.saveTokens(userId, user_id, access_token, refresh_token, expires_in)

      return access_token
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`)
      throw error
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await this.getTokens(userId)
    if (!tokens) {
      throw new Error('No tokens found for user')
    }

    const now = new Date()
    const expiresAt = new Date(tokens.expires_at)

    // Refresh if token expires in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      this.logger.log(`Token expired or expiring soon for user ${userId}, refreshing...`)
      return await this.refreshAccessToken(userId)
    }

    return tokens.access_token
  }

  /*
   * Fetch user profile from Fitbit
   */
  async fetchUserProfile(userId: string) {
    const accessToken = await this.getValidAccessToken(userId)

    try {
      const response = await axios.get(`${this.FITBIT_API_BASE}/1/user/-/profile.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      return response.data.user
    } catch (error) {
      this.logger.error(`Failed to fetch user profile: ${error.message}`)
      throw error
    }
  }




}
