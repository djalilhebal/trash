import java.util.concurrent.Semaphore;

// NOTE: See index.html to learn what this code is about.
// NOTE: To try different scenarios, just comment `p*.start()` in `main()`.

public class Exo3 {

    static char[] T = {'-', '-', '-'};

    static Semaphore mutex = new Semaphore(1, true);
    static Semaphore vide = new Semaphore(3, true);
    static Semaphore plein1 = new Semaphore(0, true);
    static Semaphore plein2 = new Semaphore(0, true);

    public static void main(String[] args) {
        // Puts lowercase letters in T
        P1 p1 = new P1();
        // Converts lowercase letters in T to uppercase
        P2 p2 = new P2();
        // Consumes uppercase letters in T and prints them
        P3 p3 = new P3();

        afficher();

        p1.start();
        p2.start();
        p3.start();

        for (int i = 0; i < 10; i++) afficher();

    }

    static void afficher() {
        final String TEMPLATE =
              "  .________________________________\n"
            + "  |                                \n"
            + "  |               [0] '%c'         \n"
            + "  |  (P1) i=%d                     \n"
            + "  |  (P2) j=%d     [1] '%c'        \n"
            + "  |  (P3) k=%d                     \n"
            + "  |               [2] '%c'         \n"
            + "  |________________________________\n"
            + "  |  vide=%d  plein1=%d  plein2=%d \n"
            + "  .________________________________\n\n";

        try {
            mutex.acquire();
        } catch (InterruptedException e) {}

        System.out.printf(
                TEMPLATE,
                T[0], P1.i, P2.j, T[1], P3.k, T[2],
                vide.availablePermits(), plein1.availablePermits(), plein2.availablePermits());

        mutex.release();
    }
}

class P1 extends Thread {
    static int i = 0;
    char c = 'a';

    @Override
    public void run() {
        while (true) {
            try {
                Exo3.vide.acquire();
                Exo3.mutex.acquire();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            Exo3.T[i] = c;
            c = c < 'z' ? (char)(c + 1) : 'a';

            i = (i + 1) % 3;
            Exo3.plein1.release();
            Exo3.mutex.release();
        }

    }

}

class P2 extends Thread {
    static int j = 0;
    char C;

    @Override
    public void run() {
        while (true) {
            try {
                Exo3.plein1.acquire();
                Exo3.mutex.acquire();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            C = Character.toUpperCase(Exo3.T[j]);
            Exo3.T[j] = C;

            j = (j + 1) % 3;
            Exo3.plein2.release();
            Exo3.mutex.release();
        }
    }

}

class P3 extends Thread {
    static int k = 0;
    char C;

    @Override
    public void run() {
        while (true) {
            try {
                Exo3.plein2.acquire();
                Exo3.mutex.acquire();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            C = Exo3.T[k];
            //System.out.print(C);
            Exo3.T[k] = '-';

            k = (k + 1) % 3;
            Exo3.vide.release();
            Exo3.mutex.release();
        }
    }

}
