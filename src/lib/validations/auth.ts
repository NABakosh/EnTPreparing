const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email обязателен";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Некорректный email";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Пароль должен содержать минимум 8 символов";
  }
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) {
    return "Имя обязательно";
  }
  if (name.trim().length < 2) {
    return "Имя должно содержать минимум 2 символа";
  }
  return null;
}
