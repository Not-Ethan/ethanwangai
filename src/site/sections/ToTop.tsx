'use client';
import { useEffect, useState } from 'react';
import { copy } from '../copy';

export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <a className="totop" href="#top" aria-label={copy.totop.aria} data-show={show ? '1' : '0'}>{copy.totop.glyph}</a>;
}
