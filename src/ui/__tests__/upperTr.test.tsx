import { render, screen } from '@testing-library/react-native';

import { Button } from '../Button';
import { upperTr } from '../upperTr';

describe('upperTr', () => {
  it('keeps the dot on i and maps dotless ı to I', () => {
    expect(upperTr('Giriş yap')).toBe('GİRİŞ YAP');
    expect(upperTr('Kurs değiştir')).toBe('KURS DEĞİŞTİR');
    expect(upperTr('Şimdi konuşamıyorum')).toBe('ŞİMDİ KONUŞAMIYORUM');
    expect(upperTr('Kayıt ol')).toBe('KAYIT OL');
    expect(upperTr('Hesabın yok mu? Kayıt ol')).toBe('HESABIN YOK MU? KAYIT OL');
  });

  it('leaves already-uppercase letters, digits and other Turkish letters intact', () => {
    expect(upperTr('İstanbul Ilık')).toBe('İSTANBUL ILIK');
    expect(upperTr('çöğüş 20 XP')).toBe('ÇÖĞÜŞ 20 XP');
  });
});

describe('Button label', () => {
  it('renders the Turkish uppercase title and keeps the original as the accessible name', async () => {
    await render(<Button title="Giriş yap" onPress={() => {}} />);
    expect(screen.getByText('GİRİŞ YAP')).toBeTruthy();
    expect(screen.queryByText('GIRIŞ YAP')).toBeNull();
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeTruthy();
  });
});
