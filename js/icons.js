// Iconos de línea (24x24, trazo = currentColor). Claves usadas por categorías y cuentas.
window.ICONS={
 cart:'<path d="M2.5 4h2.2l2.3 10.5h10.6l2-7.5H5.6"/><circle cx="9" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/>',
 house:'<path d="M2.5 11.5 12 3l9.5 8.5"/><path d="M5 9.5V21h5v-6.5h4V21h5V9.5"/>',
 bus:'<rect x="5" y="2.5" width="14" height="15.5" rx="2.5"/><path d="M5 11h14M8.5 6h7M7.5 18v2.5M16.5 18v2.5"/><circle cx="8.5" cy="14.5" r=".9"/><circle cx="15.5" cy="14.5" r=".9"/>',
 cocktail:'<path d="M3.5 5h14L10.5 13zM10.5 13v7.5M6.5 20.5h8"/><circle cx="17.5" cy="5" r="3"/>',
 thermo:'<path d="M14 14.6V5a2 2 0 0 0-4 0v9.6a4 4 0 1 0 4 0z"/><path d="M12 9v8"/>',
 tag:'<path d="M3 12.5V4h8.5L21 13.5 12.5 22z"/><circle cx="7.5" cy="8.5" r="1.4"/><path d="M14.5 11c-.6-.6-1.6-.6-2.2 0s-.3 1.4.4 1.8.9 1.3.3 1.8-1.5.5-2.1-.1M11.6 10.3l.6.6M14.6 15.3l.6.6"/>',
 gift:'<rect x="4" y="10" width="16" height="10.5"/><rect x="3" y="7" width="18" height="3"/><path d="M12 7v13.5M12 7C10.5 3.5 6.5 4 8 6.5 9 7 12 7 12 7zm0 0c1.5-3.5 5.5-3 4-.5-1 .5-4 .5-4 .5z"/>',
 food:'<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1-3.5 4.5-3.5 9H17"/>',
 car:'<path d="M3 16v-4l2.5-5.5h13L21 12v4z"/><path d="M3 16v2.5h3V16M18 16v2.5h3V16M3 12h18"/><circle cx="7" cy="14" r=".8"/><circle cx="17" cy="14" r=".8"/>',
 heart:'<path d="M12 20.5S3.5 15.5 3.5 9A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 20.5 9c0 6.5-8.5 11.5-8.5 11.5z"/>',
 shirt:'<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 2-2 3-4 3S8.5 5 8 3z"/>',
 phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
 moneybag:'<path d="M9 2.5h6l-2 4h-2z"/><path d="M10.5 6.5C6 8.5 3.5 12.5 3.5 16c0 3 3 5 8.5 5s8.5-2 8.5-5c0-3.5-2.5-7.5-7-9.5"/><path d="M14.2 11.8c-.5-.7-1.3-1-2.2-1-1.2 0-2 .6-2 1.5 0 2.1 4.3 1.2 4.3 3.4 0 .9-.9 1.5-2.2 1.5-1 0-1.8-.4-2.3-1.1M12 9.6v1.2M12 17.2v1.2"/>',
 banknotes:'<rect x="2" y="7" width="18" height="11" rx="1"/><path d="M5 4.5h17v11"/><circle cx="11" cy="12.5" r="2.8"/><path d="M4.5 9.5h1M16.5 15.5h1"/>',
 coins:'<ellipse cx="9" cy="6" rx="6" ry="2.3"/><path d="M3 6v12c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3V6M3 10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3M3 14c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3"/><path d="M15 9.5c3.3 0 6 1 6 2.3v6.2c0 1.3-2.7 2.3-6 2.3M15 13.8c3.3 0 6-1 6-2"/>',
 wallet:'<path d="M3.5 7h15.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H17v3"/><circle cx="17" cy="13.8" r="1"/>',
 card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
 store:'<path d="M3 9.5 5 4h14l2 5.5M4 9.5V20h16V9.5M3 9.5h18M10 20v-6h4v6"/>',
 briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4.5h6V7M3 13h18"/>',
 piggy:'<path d="M5 11.5a7 6 0 0 1 12.8-1.5H20v4h-2.2a7 6 0 0 1-2.8 3V20h-3v-2h-3v2H6v-3.3A6 6 0 0 1 5 11.5z"/><path d="M9.5 6.2a2.5 2.5 0 1 1 4.2-.4"/><circle cx="15" cy="10.5" r=".6"/>',
 slot:'<rect x="3" y="4" width="15" height="17" rx="2"/><path d="M6 8h9v6H6zM9 8v6M12 8v6M18 9h2v-3M20 6v0M7 17h7"/><circle cx="20" cy="5" r="1.2"/>',
 transfer:'<path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/>'
};
window.UI={
 funnel:'<path d="M3.5 4h17l-6.5 8v7l-4 2v-9z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
 transfer:window.ICONS.transfer,
 kebab:'<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
 lines:'<path d="M2 7h20M2 12h20M2 17h20"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 back:'<path d="M20 12H4M10 6l-6 6 6 6"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 chevD:'<path d="M7 10l5 5 5-5"/>',chevU:'<path d="M7 14l5-5 5 5"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 tags:window.ICONS.tag,
 pencil:'<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
window.svgIcon=(paths,cls='',sw=1.3)=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
window.ACC_ICONS=['moneybag','banknotes','coins','wallet','card','store','slot','briefcase','piggy'];
window.UI.sort='<path d="M3 4.5v14M1 16.5l2 2.5 2-2.5"/><path d="M8 12V6h6l8 8-6 6-8-8z" stroke-dasharray="2 1.6"/><circle cx="11" cy="9" r="1"/>';
window.UI.trash='<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 14h10l1-14M10 10v7M14 10v7"/>';
window.UI.swap='<path d="M7 3.5 4.5 6 7 8.5M4.5 6H17a2.5 2.5 0 0 1 2.5 2.5V11M17 20.5l2.5-2.5L17 15.5M19.5 18H7a2.5 2.5 0 0 1-2.5-2.5V13"/>';
window.UI.bksp='<path d="M8 5h13v14H8l-6-7z" fill="currentColor" stroke="none"/><path d="M11.5 9l5 6M16.5 9l-5 6" stroke="var(--hdr)" stroke-width="1.8"/>';
window.UI.cal='<rect x="3" y="4.5" width="18" height="16.5" rx="1.5" fill="currentColor" stroke="none"/><rect x="5.5" y="9" width="13" height="9.5" fill="var(--bg)" stroke="none"/><rect x="6.5" y="10" width="3.5" height="3" fill="currentColor" stroke="none"/><path d="M8 2.5v3.5M16 2.5v3.5" stroke-width="2"/>';
window.UI.pen='<path d="M3 21l3-1 11-11-2-2L4 18zM14 6l2-2 4 4-2 2M3 21h18"/>';
