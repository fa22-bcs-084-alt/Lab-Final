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

  /**
   * Fetch daily activity summary
   */
  async fetchDailyActivity(userId: string, date: string = 'today') {
    const accessToken = await this.getValidAccessToken(userId)

    try {
      const response = await axios.get(
        `${this.FITBIT_API_BASE}/1/user/-/activities/date/${date}.json`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      return response.data.summary
    } catch (error) {
      this.logger.error(`Failed to fetch daily activity: ${error.message}`)
      throw error
    }
  }

  /**
   * Fetch heart rate data
   */
  async fetchHeartRate(userId: string, date: string = 'today') {
    const accessToken = await this.getValidAccessToken(userId)

    try {
      const response = await axios.get(
        `${this.FITBIT_API_BASE}/1/user/-/activities/heart/date/${date}/1d.json`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      return response.data
    } catch (error) {
      this.logger.error(`Failed to fetch heart rate: ${error.message}`)
      throw error
    }
  }

  /**
   * Fetch sleep data
   */
  async fetchSleepData(userId: string, date: string = 'today') {
    const accessToken = await this.getValidAccessToken(userId)

    try {
      const response = await axios.get(
        `${this.FITBIT_API_BASE}/1.2/user/-/sleep/date/${date}.json`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      return response.data
    } catch (error) {
      this.logger.error(`Failed to fetch sleep data: ${error.message}`)
      throw error
    }
  }

  /**
   * Fetch all data for a user and save to fitness table (update same record for today)
   */
  async fetchAndSaveAllData(userId: string) {
    try {


       // Get today's date start in Karachi timezone (Asia/Karachi)
      const karachiDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }))
      const todayStartKarachi = new Date(karachiDate.getFullYear(), karachiDate.getMonth(), karachiDate.getDate())
      const today = new Date(todayStartKarachi.toISOString())


      console.log(`\n🔍 [FITBIT SERVICE] Starting fetch for user: ${userId}`)

      const [activity, heartRate, sleepData] = await Promise.all([
        this.fetchDailyActivity(userId, today.toISOString().split('T')[0]),
        this.fetchHeartRate(userId, today.toISOString().split('T')[0]),
        this.fetchSleepData(userId, today.toISOString().split('T')[0]),
      ])


      // Get current totals from Fitbit
      const currentSteps = activity.steps || 0
      const currentCalories = activity.activityCalories || 0
      const totalSleepMinutes = sleepData.summary?.totalMinutesAsleep || 0
      const currentSleepHours = totalSleepMinutes / 60


      console.log(`📊 Fetched Fitbit Data:`, JSON.stringify(sleepData,null,2))

      console.log(`📊 Current Fitbit Totals:`, {
        steps: currentSteps,
        calories: currentCalories,
        sleep: `${currentSleepHours.toFixed(2)} hours`
      })


      // Check if there's already a record for today
      const { data: existingRecord } = await this.supabase.getClient()
        .from('fitness')
        .select('*')
        .eq('patient_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      console.log(`📋 Existing record for today:`, existingRecord || 'None')

      if (existingRecord) {
        
        const oldSteps = existingRecord.steps || 0
        const oldCalories = existingRecord.walk_calories_burned || 0
        const oldSleep = existingRecord.sleep || 0

        console.log(`📊 Old values in DB:`, {
          steps: oldSteps,
          calories: oldCalories,
          sleep: `${oldSleep.toFixed(2)} hours`
        })

        // Check if values changed
        if (currentSteps !== oldSteps || currentCalories !== oldCalories || currentSleepHours !== oldSleep) {
          console.log(`🔄 Values changed! Updating record...`)

          const { data, error } = await this.supabase.getClient()
            .from('fitness')
            .update({
              steps: currentSteps,
              walk_calories_burned: currentCalories,
              sleep: currentSleepHours,
            })
            .eq('id', existingRecord.id)
            .select()

          if (error) {
            console.error(`❌ Failed to update fitness data:`, error)
            this.logger.error(`Failed to update fitness data: ${error.message}`)
            throw error
          }

      
          this.logger.log(`✅ Fitbit data updated in fitness table for user ${userId}`)
        
        } else {
          this.logger.log(`ℹ️ No changes detected for user ${userId}, skipping update`)
        }
      } else {
        
        console.log(`✅ No record for today. Creating new record...`)

        const { data, error } = await this.supabase.getClient()
          .from('fitness')
          .insert({
            patient_id: userId,
            steps: currentSteps,
            walk_calories_burned: currentCalories,
            sleep: currentSleepHours,
            created_at: new Date().toISOString(),
          })
          .select()

        if (error) {
          console.error(`❌ Failed to insert fitness data:`, error)
          this.logger.error(`Failed to insert fitness data: ${error.message}`)
          throw error
        }

       
        this.logger.log(`✅ Fitbit data inserted into fitness table for user ${userId}`)
      
      }

      console.log(`\n✨ Finished processing user: ${userId}\n`)
      return { activity, heartRate, sleepData }
    } catch (error) {
      console.error(`❌ Error in fetchAndSaveAllData:`, error)
      this.logger.error(`Failed to fetch and save data for user ${userId}: ${error.message}`)
      throw error
    }
  }
}
