export const isGrabUrl = (input: string) => {
  try {
    const u = new URL(input);
    return (
      u.protocol === "https:" &&
      u.username === "" &&
      u.password === "" &&
      !input.match(/^https:\/\/[^/]+:\d+/i) &&
      u.hash === "" &&
      ((u.hostname === "app.grab.com" &&
        /^\/s\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) &&
        [...u.searchParams.keys()].every((key) => key === "shareOrderLink")) ||
        (u.hostname === "sharelocation.grab.com" &&
          /^\/o\/[A-Za-z0-9]+\/?$/.test(u.pathname) &&
          u.search === ""))
    );
  } catch {
    return false;
  }
};

export const isExpired = (created: string, now = Date.now()) =>
  now - new Date(created).getTime() >= 90 * 60 * 1000;
