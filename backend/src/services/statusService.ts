import { Types } from 'mongoose';

export const buildStatusVisibilityQuery = (
  viewerId: string,
  friendIds: Array<string | Types.ObjectId>,
  now = new Date()
) => ({
  expiresAt: { $gt: now },
  $or: [
    { userId: new Types.ObjectId(viewerId) },
    {
      audience: 'contacts',
      userId: { $in: friendIds.map((id) => new Types.ObjectId(id.toString())) },
      excludedUsers: { $ne: new Types.ObjectId(viewerId) },
    },
    {
      audience: 'selected',
      userId: { $in: friendIds.map((id) => new Types.ObjectId(id.toString())) },
      allowedUsers: new Types.ObjectId(viewerId),
      excludedUsers: { $ne: new Types.ObjectId(viewerId) },
    },
  ],
});

const idOf = (value: any) => value?._id?.toString?.() || value?.toString?.();

export const presentStatus = (status: any, viewerId: string) => {
  const value = typeof status.toObject === 'function' ? status.toObject() : { ...status };
  const isOwner = idOf(value.userId) === viewerId;

  if (value.poll) {
    value.poll = {
      question: value.poll.question,
      options: value.poll.options.map((option: any) => ({
        id: option.id,
        text: option.text,
        votes: option.voters.length,
        selected: option.voters.some((id: any) => idOf(id) === viewerId),
      })),
    };
  }
  if (value.question) {
    value.question = {
      prompt: value.question.prompt,
      answered: value.question.answers.some((answer: any) => idOf(answer.userId) === viewerId),
      ...(isOwner ? { answers: value.question.answers } : {}),
    };
  }
  if (value.slider) {
    const own = value.slider.responses.find((response: any) => idOf(response.userId) === viewerId);
    value.slider = {
      emoji: value.slider.emoji,
      responseCount: value.slider.responses.length,
      average: value.slider.responses.length
        ? Math.round(value.slider.responses.reduce((sum: number, response: any) => sum + response.value, 0) / value.slider.responses.length)
        : 0,
      value: own?.value,
    };
  }
  value.likes = (value.likes || []).map((like: any) => like?._id?.toString?.() || like.toString());
  if (!isOwner) value.views = value.views?.length || 0;
  return value;
};

