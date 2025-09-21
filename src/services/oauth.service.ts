import { logger } from '../config';
import { IUserDocument, User } from '../models';
import { IAuthTokens, IOAuthUser } from '../types';

export const handleOAuthLogin = async (
  provider: 'google' | 'facebook',
  oauthUser: IOAuthUser,
): Promise<{ user: IUserDocument; tokens: IAuthTokens }> => {
  try {
    let user = await User.findOne({
      oauthProvider: provider,
      oauthId: oauthUser.oauthId,
    }).select('-password');

    if (!user) {
      // Check if email exists with a different provider or no provider
      user = await User.findOne({ email: oauthUser.email }).select('-password');
      if (user) {
        // Update existing user with OAuth details
        user.oauthProvider = provider;
        user.oauthId = oauthUser.oauthId;
        user.profilePicture = oauthUser.profilePicture || user.profilePicture;
        user.isVerified = true;
        await user.save();
      } else {
        // Create new user
        user = new User({
          email: oauthUser.email,
          username: `${oauthUser.email.split('@')[0]}${Math.random().toString(36).slice(-4)}`,
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName,
          profilePicture: oauthUser.profilePicture || '',
          oauthProvider: provider,
          oauthId: oauthUser.oauthId,
          isVerified: true,
        });
        await user.save();
      }
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    logger.info(`${provider} OAuth login successful`, {
      userId: user._id,
      email: user.email,
    });
    return { user, tokens };
  } catch (error) {
    logger.error(`${provider} OAuth login failed`, {
      error: (error as Error).message,
      oauthId: oauthUser.oauthId,
    });
    throw error;
  }
};
