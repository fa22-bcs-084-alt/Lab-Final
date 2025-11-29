import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { FitbitService } from '../fitbit/fitbit.service'

@Injectable()
export class FitbitScheduler {
  private readonly logger = new Logger(FitbitScheduler.name)

  constructor(private readonly fitbitService: FitbitService) {}

  /**
   * Fetch Fitbit data for all users every 2 minutes
   * Saves only the delta (difference) to avoid redundant data
   */
  @Cron('*/2 * * * *', {
    name: 'fetch-fitbit-data',
    timeZone: 'Asia/Karachi',
  })
  async handleFitbitDataFetch() {
    this.logger.log('🔄 Starting scheduled Fitbit data fetch for all users...')
    
    try {
      const users = await this.fitbitService.getAllUsersWithTokens()
      
      if (!users || users.length === 0) {
        this.logger.log('ℹ️ No users with Fitbit tokens found')
        return
      }

      this.logger.log(`📊 Found ${users.length} users with Fitbit tokens`)

      for (const user of users) {
        try {
       
          
         await this.fitbitService.fetchAndSaveAllData(user.user_id)
          

      
        } catch (error) {
          this.logger.error(`❌ Failed to fetch data for user ${user.user_id}: ${error.message}`)
          
        }
      }

      this.logger.log('✨ Completed scheduled Fitbit data fetch')
    } catch (error) {
      this.logger.error(`❌ Error in scheduled Fitbit data fetch: ${error.message}`)
    }
  }

  /**
   * Optional: Manual trigger for testing
   * You can call this method manually for testing purposes
   */
  async manualFetch(userId: string) {
    this.logger.log(`🔧 Manual Fitbit data fetch for user ${userId}`)
    try {
      const data = await this.fitbitService.fetchAndSaveAllData(userId)
      this.logger.log(`✅ Manual fetch successful for user ${userId}`)
      return data
    } catch (error) {
      this.logger.error(`❌ Manual fetch failed for user ${userId}: ${error.message}`)
      throw error
    }
  }
}
