interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
}: ButtonProps) => {
  const style: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: variant === 'primary' ? '#0070f3' : '#ccc',
    color: 'white',
    border: 'none',
    fontWeight: 'bold',
  };

  return (
    <button style={style} onClick={onClick}>
      {children}
    </button>
  );
};
