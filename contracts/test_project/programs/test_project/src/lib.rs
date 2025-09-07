use anchor_lang::prelude::*;

declare_id!("8R8Z9KVvtBaNJ2P9x2tPQRVSC9WrXQgei7xA7AHz1C7L");

#[program]
pub mod test_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
