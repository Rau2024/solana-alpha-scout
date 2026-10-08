use anchor_lang::prelude::*;

declare_id!("ALphaxScout11111111111111111111111111111111");

#[program]
pub mod alpha_scout {
    use super::*;

    /// Instruction to publish an AI-generated report (Trend Score & Grade) directly on-chain
    pub fn publish_report(
        ctx: Context<PublishReport>,
        token_symbol: String,
        trend_score: u8,
        grade: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        // Save the AI insights to the Solana ledger permanently
        report.token_symbol = token_symbol;
        report.trend_score = trend_score;
        report.grade = grade;
        report.timestamp = Clock::get()?.unix_timestamp;
        report.authority = ctx.accounts.authority.key();
        
        msg!("Alpha Scout Report Published: {} | Score: {}", report.token_symbol, report.trend_score);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(token_symbol: String)]
pub struct PublishReport<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        // Calculate space needed: Discriminator (8) + String max length + u8 + timestamp + pubkey
        space = 8 + (4 + 32) + 1 + (4 + 32) + 8 + 32,
        seeds = [b"ai_report", token_symbol.as_bytes()],
        bump
    )]
    pub report: Account<'info, AiReport>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AiReport {
    pub token_symbol: String,
    pub trend_score: u8,
    pub grade: String,
    pub timestamp: i64,
    pub authority: Pubkey,
}
