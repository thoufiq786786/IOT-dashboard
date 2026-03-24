// import java.sql.Connection;
// import java.sql.DriverManager;
// import java.sql.ResultSet;
// import java.sql.Statement;

// public class TestDB {
//     public static void main(String[] args) {
//         try {
//             Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/iot_db", "postgres", "root");
//             Statement s = c.createStatement();
//             ResultSet rs = s.executeQuery("SELECT * FROM dashboard LIMIT 1");
//             var meta = rs.getMetaData();
//             for(int i = 1; i <= meta.getColumnCount(); i++) {
//                 System.out.println(meta.getColumnName(i));
//             }
//         } catch(Exception e) {
//             e.printStackTrace();
//         }
//     }
// }
