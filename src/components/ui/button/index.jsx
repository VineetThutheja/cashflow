const Button = ({ children, onClick, className }) => (
    <button
      onClick={onClick}
      className={`py-2 px-4 rounded-md font-semibold transition-all ${className}`}
    >
      {children}
    </button>
  );
 export default Button;  