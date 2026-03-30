// Online C++ compiler to run C++ program online
#include <iostream>
#include <vector>
#include <random>

using namespace std;

int main() {
    // Write C++ code here
    int min = 0;
    int max = 2;

    int random_number = rand() % (max - min + 1) + min;

    vector<int> arr(3, 0);

    for (int i = 0; i < 3; i++) {
        if (i == random_number) {
            arr[i] = 1;
        }
    }

    cout << "Which gate has car?" << endl;

    int m;
    cin >> m;

    int n = m + 1;
    int rem;

    while (true) {
        rem = n % 3;

        if (rem != random_number) {
            arr[rem] = -1;
            break;
        }

        n++;
    }

    cout << "Do you want to stick to your input (1->yes, 0->no): " << endl;

    int choice;
    cin >> choice;

    if (choice == 1 && m == random_number) {
        cout << "Correct choice!!" << endl;
    }
    else if (choice == 0 && (m != rem)) {
        cout << "Correct answer!!" << endl;
    }
    else {
        cout << "Incorrect answer!!" << endl;
    }

    return 0;
}