export type CartItemTarget = 'self' | string;

export type ActivityCartItem = {
  activityId: string;
  activityName: string;
  price: number;
  target: CartItemTarget;
  targetLabel: string;
  groupId?: string;
  groupName?: string;
};

export const ACTIVITY_CART_STORAGE_KEY = 'hualas-activity-cart';
