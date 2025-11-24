// screens/Admin/AdminReportList.tsx
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';
import Header from '../../components/header_for_detail';
import AdminReportCard from '../Report/AdminReportCard';

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description: string;
  level: string;
  images: string[];
  video?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  createdAt: any;
  customReason?: string;
  userName: string;
  reportedUserName: string;
}

const AdminReportList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');

  const loadReports = async () => {
    try {
      setLoading(true);
      let reportsQuery;
      
      if (filter === 'all') {
        reportsQuery = query(
          collection(db, "reports"), 
          orderBy("createdAt", "desc")
        );
      } else {
        reportsQuery = query(
          collection(db, "reports"),
          where("status", "==", filter),
          orderBy("createdAt", "desc")
        );
      }
      
      const querySnapshot = await getDocs(reportsQuery);
      
      const reportsList: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsList.push({
          id: doc.id,
          reporterId: data.reporterId,
          reportedUserId: data.reportedUserId,
          reason: data.reason,
          description: data.description,
          level: data.level,
          images: data.images || [],
          video: data.video,
          status: data.status || 'pending',
          createdAt: data.createdAt,
          customReason: data.customReason,
          userName: data.userName,
          reportedUserName: data.reportedUserName
        });
      });
      
      setReports(reportsList);
    } catch (error) {
      console.error("Load reports error:", error);
      alert('Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleReportUpdate = () => {
    loadReports();
  };

  const getStatusCount = (status: string) => {
    return reports.filter(report => report.status === status).length;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
        <Text>Loading reports...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Report Management" />
      
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          Total Reports: {reports.length}
        </Text>
        <Text style={styles.counterSubText}>
          {getStatusCount('pending')} pending, {getStatusCount('reviewed')} reviewed, {getStatusCount('resolved')} resolved
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'pending' && styles.activeFilterTab]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
            Pending ({getStatusCount('pending')})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'reviewed' && styles.activeFilterTab]}
          onPress={() => setFilter('reviewed')}
        >
          <Text style={[styles.filterText, filter === 'reviewed' && styles.activeFilterText]}>
            Reviewed ({getStatusCount('reviewed')})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'resolved' && styles.activeFilterTab]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.activeFilterText]}>
            Resolved ({getStatusCount('resolved')})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        renderItem={({ item }) => (
          <AdminReportCard 
            report={item} 
            onReportUpdate={handleReportUpdate}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'No reports found' 
                : `No ${filter} reports found`
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  counter: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  counterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003B36',
    marginBottom: 4,
  },
  counterSubText: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: '#00A86B',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#00A86B',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default AdminReportList;