export type ActionResult<T = void> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

