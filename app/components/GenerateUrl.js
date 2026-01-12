export const generateEventUrl = (event) => {
    const eventNameForUrl = event.eventname
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ə/g, 'e')
    .replace(/["']/g, '') 
    .replace(/\?/g, "")
    .replace(/\//g, "-")
    .trim() 
    .replace(/\s+/g, '-')  
    .toLowerCase();  
  
    return `event-details/${eventNameForUrl}_${event.id}`;
  };