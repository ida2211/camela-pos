import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn) {
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <img 
          src="/src/assets/logo-camela-outwear.svg" 
          alt="CAMELA OUTWEAR Logo" 
          className="h-32 w-auto mx-auto mb-4"
        />
        <h1 className="text-4xl font-bold">CAMELA</h1>
        <p className="text-xl text-muted-foreground">OUTWEAR</p>
        <p className="text-xl text-muted-foreground">Manajemen Toko</p>
        <p className="mt-4 text-sm text-muted-foreground">Mengarahkan...</p>
      </div>
    </div>
  );
};

export default Index;
